#include "ElectricalSystems/DigitalMultimeterComponent.h"

UDigitalMultimeterComponent::UDigitalMultimeterComponent()
	: CurrentMode(EDmmMode::Off)
	, RedLeadJack(EDmmLeadJack::VOhm)
	, RedProbeNode(TEXT(""))
	, BlackProbeNode(TEXT(""))
	, bIsMeterFuseBlown(false)
	, InputImpedanceVolts(10000000.0f)
	, BurdenResistanceAmps(0.01f)
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDigitalMultimeterComponent::SetMode(EDmmMode NewMode)
{
	CurrentMode = NewMode;
	if (CurrentMode == EDmmMode::DcAmps)
	{
		RedLeadJack = EDmmLeadJack::A10A;
	}
	else if (RedLeadJack == EDmmLeadJack::A10A)
	{
		RedLeadJack = EDmmLeadJack::VOhm;
	}
}

void UDigitalMultimeterComponent::ConnectProbes(const FString& InRedNode, const FString& InBlackNode)
{
	RedProbeNode = InRedNode;
	BlackProbeNode = InBlackNode;
}

FDmmReading UDigitalMultimeterComponent::TakeMeasurement(float SimulatedPotentialDiff, float SimulatedResistance, float SimulatedCurrent, bool bIsCircuitEnergized)
{
	FDmmReading Reading;

	if (CurrentMode == EDmmMode::Off)
	{
		Reading.DisplayText = TEXT("OFF");
		Reading.UnitText = TEXT("");
		return Reading;
	}

	if (RedProbeNode.IsEmpty() || BlackProbeNode.IsEmpty())
	{
		Reading.DisplayText = TEXT("LEADS OPEN");
		Reading.UnitText = TEXT("");
		return Reading;
	}

	// 1. DC Volts
	if (CurrentMode == EDmmMode::DcVolts)
	{
		if (RedLeadJack == EDmmLeadJack::A10A)
		{
			Reading.DisplayText = TEXT("LEAD ERR");
			Reading.bIsHazard = true;
			return Reading;
		}

		Reading.NumericValue = SimulatedPotentialDiff;
		Reading.DisplayText = FString::Printf(TEXT("%.2f"), SimulatedPotentialDiff);
		Reading.UnitText = TEXT("V DC");
		return Reading;
	}

	// 2. Resistance Mode
	if (CurrentMode == EDmmMode::Resistance)
	{
		if (bIsCircuitEnergized)
		{
			Reading.DisplayText = TEXT("ERR: POWER ON");
			Reading.bIsHazard = true;
			return Reading;
		}

		Reading.NumericValue = SimulatedResistance;
		if (SimulatedResistance >= 1e8f)
		{
			Reading.DisplayText = TEXT("O.L");
			Reading.UnitText = TEXT("M Ohm");
			Reading.bIsOverRange = true;
		}
		else
		{
			Reading.DisplayText = FString::Printf(TEXT("%.2f"), SimulatedResistance);
			Reading.UnitText = TEXT("Ohm");
		}
		return Reading;
	}

	// 3. Continuity Mode
	if (CurrentMode == EDmmMode::Continuity)
	{
		if (bIsCircuitEnergized)
		{
			Reading.DisplayText = TEXT("ERR: POWER ON");
			Reading.bIsHazard = true;
			return Reading;
		}

		Reading.NumericValue = SimulatedResistance;
		const bool bBeep = (SimulatedResistance <= 30.0f);
		Reading.bIsContinuityBeep = bBeep;
		Reading.bIsOverRange = !bBeep;
		Reading.DisplayText = bBeep ? FString::Printf(TEXT("%.1f Ohm (BEEP)"), SimulatedResistance) : TEXT("O.L (OPEN)");
		Reading.UnitText = TEXT("");
		return Reading;
	}

	// 4. DC Amps Mode
	if (CurrentMode == EDmmMode::DcAmps)
	{
		if (RedLeadJack != EDmmLeadJack::A10A)
		{
			Reading.DisplayText = TEXT("ERR: JACK CONFIG");
			Reading.bIsHazard = true;
			return Reading;
		}

		if (bIsMeterFuseBlown)
		{
			Reading.DisplayText = TEXT("FUSE BLOWN");
			Reading.bIsHazard = true;
			return Reading;
		}

		if (SimulatedCurrent > 10.0f)
		{
			bIsMeterFuseBlown = true;
			Reading.DisplayText = TEXT("FUSE BLOWN");
			Reading.bIsHazard = true;
			return Reading;
		}

		Reading.NumericValue = SimulatedCurrent;
		Reading.DisplayText = FString::Printf(TEXT("%.3f"), SimulatedCurrent);
		Reading.UnitText = TEXT("A DC");
		return Reading;
	}

	return Reading;
}

void UDigitalMultimeterComponent::ReplaceMeterFuse()
{
	bIsMeterFuseBlown = false;
}
