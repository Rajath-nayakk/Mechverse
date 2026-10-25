#include "WorkshopTools/ToolBase.h"

AToolBase::AToolBase()
	: ToolName(FText::FromString(TEXT("Standard 1/2\" Torque Wrench")))
	, Category(EToolCategory::TorqueWrench)
	, InstalledSocketSizeMm(17.0f)
	, ConfiguredTorqueSettingNm(25.0f)
{
	PrimaryActorTick.bCanEverTick = false;
}

bool AToolBase::CanOperateOnFastener(const FFastenerSpecification& FastenerSpec, FText& OutFailureReason) const
{
	if (Category != EToolCategory::HandWrench && 
		Category != EToolCategory::RatchetSocket && 
		Category != EToolCategory::TorqueWrench && 
		Category != EToolCategory::ImpactGun)
	{
		OutFailureReason = FText::FromString(TEXT("Selected tool is not a fastener tightening/loosening tool."));
		return false;
	}

	if (FMath::Abs(InstalledSocketSizeMm - FastenerSpec.SocketSizeMm) > 0.1f)
	{
		OutFailureReason = FText::FromString(FString::Printf(TEXT("Socket size mismatch! Tool has %.1f mm socket, fastener requires %.1f mm."), InstalledSocketSizeMm, FastenerSpec.SocketSizeMm));
		return false;
	}

	OutFailureReason = FText::FromString(TEXT("Tool is compatible."));
	return true;
}
