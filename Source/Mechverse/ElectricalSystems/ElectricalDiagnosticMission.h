#pragma once

#include "CoreMinimal.h"
#include "UObject/NoExportTypes.h"
#include "ElectricalDiagnosticMission.generated.h"

USTRUCT(BlueprintType)
struct FElectricalMissionObjective
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Objective")
	FString ObjectiveId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Objective")
	FText Description;

	UPROPERTY(BlueprintReadOnly, Category = "Objective")
	bool bIsCompleted;

	FElectricalMissionObjective()
		: bIsCompleted(false)
	{}
};

UCLASS(BlueprintType, Blueprintable)
class MECHVERSE_API UElectricalDiagnosticMission : public UObject
{
	GENERATED_BODY()

public:
	UElectricalDiagnosticMission();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission|Details")
	FString MissionId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission|Details")
	FText Title;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission|Details")
	FText CustomerComplaint;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission|Details")
	FString TargetFaultId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission|Details")
	TArray<FElectricalMissionObjective> Objectives;

	UPROPERTY(BlueprintReadOnly, Category = "Mission|State")
	bool bIsDiagnosisConfirmed;

	UPROPERTY(BlueprintReadOnly, Category = "Mission|State")
	bool bIsRepaired;

	UPROPERTY(BlueprintReadOnly, Category = "Mission|State")
	bool bIsVerified;

	UFUNCTION(BlueprintCallable, Category = "Mission")
	bool SubmitDiagnosis(const FString& InFaultId, FText& OutMessage);

	UFUNCTION(BlueprintCallable, Category = "Mission")
	bool ExecuteRepair(FText& OutMessage);

	UFUNCTION(BlueprintCallable, Category = "Mission")
	bool VerifyRepair(float MeasuredMetric, float ThresholdMax, FText& OutMessage);
};
